import axios from 'axios';

/* get card artwork by passcode */
export const getArtwork = async (req, res, next) => {
    const { passcode } = req.params;
    try {
        const url = `https://images.ygoprodeck.com/images/cards_cropped/${passcode}.jpg`;
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream',
        });
        response.data.pipe(res);
    } catch (error) {
        next(new ApiError(error.response.status, error.response.statusText, error.stack));
    }
}